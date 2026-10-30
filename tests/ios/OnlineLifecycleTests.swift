import XCTest

// Runs the shipping Release app under a separate bundle identifier. The web host
// is created by scripts/test-iphone-online.mjs; only its disposable room is used.
@MainActor
final class OnlineLifecycleTests: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "vn.masoi.app.lifecycle")
    private var room = ""
    private var token = ""
    private let origin = "https://masoi.yennhi.tech"

    override func setUpWithError() throws {
        continueAfterFailure = false
        room = ProcessInfo.processInfo.environment["MA_SOI_TEST_ROOM"] ?? ""
        token = ProcessInfo.processInfo.environment["MA_SOI_TEST_HOST_TOKEN"] ?? ""
        try XCTSkipIf(room.isEmpty || token.isEmpty, "Run with scripts/test-iphone-online.mjs and a disposable fixture.")
    }

    private func request(_ body: [String: Any]? = nil) async throws -> [String: Any] {
        var req = URLRequest(url: URL(string: origin + "/api/room" + (body == nil ? "?code=" + room : ""))!)
        req.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        req.timeoutInterval = 20
        if var operation = body {
            operation["code"] = room
            if operation["requestId"] == nil { operation["requestId"] = UUID().uuidString }
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: operation)
        }
        let (data, response) = try await URLSession.shared.data(for: req)
        XCTAssertEqual((response as? HTTPURLResponse)?.statusCode, 200, "Disposable room API request failed")
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }
    private func roomData(_ s: [String: Any]) -> [String: Any] { s["room"] as! [String: Any] }
    private func game(_ s: [String: Any]) -> [String: Any] { s["game"] as! [String: Any] }
    private func command(_ command: [String: Any], snapshot: [String: Any]) async throws -> [String: Any] {
        try await request(["type": "command", "stepId": game(snapshot)["stepId"]!, "command": command])
    }
    private func visible(_ element: XCUIElement, timeout: TimeInterval = 15) {
        XCTAssertTrue(element.waitForExistence(timeout: timeout), "Expected app element did not appear")
    }
    private func confirmRole() {
        let ready = app.webViews.buttons["Tôi đã đọc và sẵn sàng"]
        visible(ready); ready.tap()
        visible(app.webViews.staticTexts["Bạn đã sẵn sàng"])
    }
    private func assertSession() {
        visible(app.webViews.staticTexts[room])
        XCTAssertFalse(app.webViews.textFields["Tên của bạn"].exists, "Session fell back to join form")
    }

    func testWebAndNativePlayWithBackgroundAndColdLaunch() async throws {
        app.launch()
        let fields = app.webViews.textFields
        visible(fields.element(boundBy: 0))
        fields.element(boundBy: 0).tap(); fields.element(boundBy: 0).typeText(room)
        fields.element(boundBy: 1).tap(); fields.element(boundBy: 1).typeText("iPhone QA")
        let joins = app.webViews.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Vào phòng"))
        joins.element(boundBy: joins.count - 1).tap()
        assertSession()
        var s = try await request()
        let members = roomData(s)["members"] as! [[String: Any]]
        let nativeID = try XCTUnwrap(members.first { ($0["name"] as? String) == "iPhone QA" }?["id"] as? String)
        print("LIFECYCLE: native-joined")

        XCUIDevice.shared.press(.home)
        s = try await request(["type": "addOffline", "name": "Web QA D", "expectedRevision": roomData(s)["revision"]!])
        let resumeStart = ProcessInfo.processInfo.systemUptime
        app.activate(); assertSession(); visible(app.webViews.staticTexts["Web QA D"])
        print("LIFECYCLE: lobby-resumed-ms=\(Int((ProcessInfo.processInfo.systemUptime - resumeStart) * 1000))")

        // Cold launch must use native persisted capability and route, not a rejoin.
        app.terminate(); app.launch(); assertSession()
        s = try await request()
        XCTAssertEqual((roomData(s)["members"] as! [[String: Any]]).filter { ($0["name"] as? String) == "iPhone QA" }.count, 1)
        print("LIFECYCLE: cold-launch-kept-identity")

        XCUIDevice.shared.press(.home)
        s = try await request(["type": "start", "expectedRevision": roomData(s)["revision"]!, "roles": ["wolf", "villager", "villager", "villager", "villager"]])
        app.activate(); confirmRole()
        s = try await request()
        for member in roomData(s)["members"] as! [[String: Any]] where (member["offline"] as? Bool) == true {
            s = try await request(["type": "offlineReady", "playerId": member["id"]!])
        }
        s = try await request(["type": "begin", "expectedRevision": roomData(s)["revision"]!])
        let players = game(s)["players"] as! [[String: Any]]
        let wolf = try XCTUnwrap(players.first { ($0["role"] as? String) == "wolf" })
        let wolfID = wolf["id"] as! String
        let target = try XCTUnwrap(players.first { ($0["id"] as? String) != nativeID && ($0["id"] as? String) != wolfID })
        var completedNight = false
        for _ in 0..<45 {
            if (game(s)["step"] as? String) == "review" { completedNight = true; break }
            let progress = game(s)["progress"] as? [[String: Any]] ?? []
            if (game(s)["step"] as? String) == "wolves" {
                if wolfID == nativeID {
                    let wake = app.webViews.buttons["Tôi đã thức dậy"]
                    visible(wake); wake.tap()
                    let pick = app.webViews.buttons["Chọn " + (target["name"] as! String)]
                    visible(pick); pick.tap(); app.webViews.buttons["Xác nhận"].tap()
                    let deadline = Date().addingTimeInterval(15)
                    repeat {
                        s = try await request()
                        if let actions = game(s)["actions"] as? [String: Any], actions[nativeID] != nil { break }
                        try await Task.sleep(nanoseconds: 200_000_000)
                    } while Date() < deadline
                    XCTAssertNotNil((game(s)["actions"] as? [String: Any])?[nativeID])
                } else {
                    for command in [["type": "wake"], ["type": "act", "action": ["type": "bite", "target": target["id"]!]]] as [[String: Any]] {
                        s = try await request(["type": "offlineCommand", "playerId": wolfID, "stepId": game(s)["stepId"]!, "command": command])
                    }
                }
            } else {
                XCTAssertTrue(progress.isEmpty || progress.allSatisfy { ($0["submitted"] as? Bool) == true }, "Unexpected role in the simple test deck")
            }
            s = try await command(["type": "advance"], snapshot: s)
        }
        XCTAssertTrue(completedNight)
        if (game(s)["resolved"] as? Bool) != true { s = try await command(["type": "resolve"], snapshot: s) }
        XCUIDevice.shared.press(.home)
        s = try await command(["type": "publish"], snapshot: s)
        app.activate(); assertSession()
        visible(app.webViews.staticTexts["Cả làng thức dậy."])
        print("LIFECYCLE: night-to-day-resumed")

        // Identical retry is safe even when the phase has changed.
        let verdict: [String: Any] = ["type": "command", "requestId": UUID().uuidString, "stepId": game(s)["stepId"]!, "command": ["type": "verdict", "target": wolfID]]
        s = try await request(verdict)
        let revision = roomData(s)["revision"] as! Int
        _ = try await request(verdict)
        s = try await request()
        XCTAssertEqual(roomData(s)["revision"] as? Int, revision)
        XCTAssertEqual(game(s)["step"] as? String, "ended")
        app.terminate(); app.launch(); assertSession()
        visible(app.webViews.staticTexts["Kết thúc"])
        print("LIFECYCLE: full-game-ended-retry-idempotent")
    }
}
