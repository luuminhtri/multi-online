// Display metadata; execution is implemented separately in extensions.ts.
export const EXTRA_DEFINITIONS = {
  "ghost": {
    "name": "Con ma",
    "description": "Con ma bị chết ngay vào đêm đầu tiên. Mỗi đêm ( bao gồm cả đêm đầu tiên), Con Ma có thể liên hệ với những người chơi khác bằng cách viết 1 chữ lên 1 tờ giấy nhưng không được viết tên hay viết tắt tên, mà thay vào đó là đưa ra các gợi ý thú vị."
  },
  "idiot": {
    "name": "Thằng ngốc",
    "description": "Thằng ngốc luôn luôn phải giơ tay tán thành việc giết một người chơi khác. Biến thể: Không chia chức năng này, nhưng ngẫu nhiên chọn 1 người làm Thằng ngốc, và phiếu của người này luôn được tính là phiếu giết."
  },
  "mason": {
    "name": "Sinh đôi",
    "description": "Đêm đầu tiên, Quản trò gọi Sinh đôi dậy để tìm kiếm các Sinh đôi khác. Không ai trong làng được phép nói hoặc ám chỉ về Sinh đôi, bằng không họ sẽ bị giết đêm hôm đó, tự động xử thua dù thuộc phe thắng."
  },
  "mayor": {
    "name": "Thị trưởng",
    "description": "Phiếu biểu quyết của Thị trường được tính là 2 phiếu khi biểu quyết treo cổ."
  },
  "old_hag": {
    "name": "Phù Thủy già",
    "description": "Mỗi đêm, Phù thủy già chọn một người chơi để dời khỏi làng vào ngày hôm sau ( không được tham gia bình luận, biểu quyết treo cổ…)"
  },
  "pacifist": {
    "name": "Người yêu hòa bình",
    "description": "Người Yêu hòa bình luôn vote cho người chơi được sống. Chức năng này đi chung với lá bài Thằng ngốc."
  },
  "paranormal_investigator": {
    "name": "Paranormal Investigator)",
    "description": "Một đêm trong ván game, Thám tử sẽ được gọi dậy và được phép chọn 1 một người. Quản trò sẽ cho Thám tử biết người đó hoặc hai người bên cạnh người đó có phải là Ma sói hay không."
  },
  "priest": {
    "name": "Thầy tu",
    "description": "Một đêm trong ván game, Thầy tu có thể chọn một người chơi để được bảo vệ bởi sức mạnh của Chúa. Người chơi này sẽ bất tử vào buổi đêm. Chỉ bị loại bởi các lí do vào bam ngày. ( như bị treo cổ)."
  },
  "spellcaster": {
    "name": "Người phù phép",
    "description": "Mỗi đêm, Người phú phép sẽ được phép chỉ định 1 người bị câm vào hôm sau. Người này vào ngày hôm sau sẽ không được nói."
  },
  "troublemaker": {
    "name": "Kẻ phá rối",
    "description": "Mỗi đêm, Quản trò sẽ hỏi “ Kẻ phá rối có muốn quậy phá không?”. Nếu đồng ý, Kẻ quậy phá sẽ tỉnh dậy và ra hiệu bằng cách gật đầu. Ngày hôm sau, sẽ có 2 lượt biểu quyết treo cổ. Kẻ phá rối chỉ thực hiện được 1 lần quậy phá trong suốt cả ván chơi."
  },
  "minion": {
    "name": "Kẻ phản bội",
    "description": "Phản bội thức dậy cùng Sói và biết Sói là ai. Tham gia cùng Sói để giết Dân làng. Tuy nhiên Tiên tri khi soi vào Phản bội thì vẫn ra dân làng."
  },
  "sorceress": {
    "name": "Pháp sư sói",
    "description": "Mỗi đêm, Pháp sư sói thức dậy và sẽ đi tìm kiếm Tiên tri bằng cách chỉ thị một người, Quản trò sẽ cho biết đó có phải Tiên tri hay không. Sói không được biết Pháp sư Sói là ai và Pháp sư sói cũng không biết Sói là ai. Tiên tri sẽ soi Pháp sư sói là người."
  },
  "lone_wolf": {
    "name": "Sói cô đơn",
    "description": "Hằng đêm, thức dậy cùng những con Sói khác. Sói cô đơn chỉ thắng cuộc nếu là người chơi cuối cùng trong trò chơi."
  },
  "drunk": {
    "name": "Say rượu",
    "description": "Trong hai đêm đầu tiên, Say rượu sẽ thuộc phe Dân làng. Vào đêm thứ ba, Quản trò sẽ gọi anh ta dậy và cho anh ta biết vai trò thực sự của mình là gì bằng cách chuẩn bị sẵn một bộ bài có 1 Sói, 1 Dân và hầu hết các chức năng đặc biệt và rút ra 1 lá. Lá được chọn là chức năng thật sự của Say rượu. Say rượu được Tiên tri soi là Người."
  },
  "cult_leader": {
    "name": "Trưởng giáo phái",
    "description": "Mỗi đêm, Trưởng giáo phải sẽ tỉnh dậy và thêm 1 người chơi vào giáo phái của mình. Nếu tất cả những người còn sống đều là người của giáo phái của mình, Trưởng giáo phái sẽ là người chiến thắng. Các điều kiện thắng khác cũng được áp dụng."
  },
  "hoodlum": {
    "name": "Du côn",
    "description": "Vào đêm đầu tiên, chỉ định hai người chơi. Nếu đến cuối trò chơi, hai người chơi này bị chết và Du côn vẫn còn sống, thì Du côn dành chiến thắng.Các điều kiện thắng khác cũng được áp dụng."
  },
  "tanner": {
    "name": "Chán đời",
    "description": "Chán đời chỉ thắng khi anh ta bị giết. Các điều kiện thắng khác cũng được áp dụng."
  },
  "vampire": {
    "name": "Ma cà rồng",
    "description": "Là 1 thế lực mạnh thứ 3 ngoài Phe Sói và Phe dân. Mỗi đêm, Ma cà rồng sẽ chọn 1 người chơi là nạn nhân. Nhưng nạn nhân của Ma cà rồng sẽ được công bố sau khi phiên treo cổ diễn ra. Vampire không thể bị giết bởi Ma sói vào ban đêm."
  },
  "wolverine": {
    "name": "Chó sói",
    "description": "Hằng đêm, thức dậy cùng Sói. Nếu Chó sói là con Sói ngồi gần nạn nhân nhất, những người chơi sẽ nghe thấy tiếng kim loại chạm vào nhau."
  },
  "revealer": {
    "name": "Kẻ khám phá",
    "description": "Mỗi đêm, Kẻ khám phá sẽ tỉnh dậy và chỉ vào một người chơi. Nếu người chơi đó là Ma sói, người đó sẽ loại. Nếu không, Kẻ khám phá sẽ bị loại."
  },
  "huntress": {
    "name": "Nữ Thợ săn",
    "description": "Thuộc phe Dân làng. Một lần trong trò chơi, Nữ thợ săn có thể chỉ định giết một người chơi."
  },
  "bigfoot": {
    "name": "Chân to",
    "description": "Ban đầu thuộc phe Dân làng. Nhưng thật không may Tiên tri nếu soi vào Chân to lại ra phe Sói vì anh ta trông lông lá giống Sói. Anh ta sẽ thuộc phe Dân làng cho đến một ngày không có cuộc treo cổ nào. Ngày hôm đó anh ta sẽ rất tức giận và quyết định chuyển sang Phe Sói vào ngày hôm sau."
  },
  "nostradamus": {
    "name": "Nhà Tiên Tri Nostradamus",
    "description": "Thuộc phe thứ 3. Đêm đầu tiên, Nhà tiên tri Nostradamus sẽ tỉnh dậy và dự đoán xem Phe nào sẽ dành chiến thắng. Nếu Nostradamus còn sống ở cuối trò chơi và phe mà Nhà tiên tri dự đoán thực sự thắng, Nostradamus dành chiến thắng."
  },
  "bloody_mary": {
    "name": "Bloody Marry",
    "description": "Ban đầu Bloody Mary thuộc phe Dân làng. Nếu Bloody Mary bị giết, mỗi đêm tiếp theo Bloody Mary sẽ bắt đầu chọn một người để giết, bắt đầu từ người giết mình. Nếu người giết Bloody Mary là Ma sói, cô ta sẽ giết từng Ma sói. Nếu người giết là Dân làng, cô ta sẽ giết từng Dân làng. Khi Bloody Mary chết, cô ấy thắng nếu đội giết cô ấy thua. Vì vậy, nếu đội Người sói giết cô ấy, cô ấy sẽ ở lại đội Làng (đội mà cô ấy tham gia nếu cô ấy sống ở cuối trò chơi). Nếu đội Làng bầu chọn cô ấy, cô ấy sẽ tham gia đội Người sói / Ma cà rồng để cố gắng tiêu diệt đội Làng."
  },
  "leprechaun": {
    "name": "Yêu Tinh",
    "description": "Thuộc phe Dân làng. Hàng đêm Yêu tinh sẽ thức dậy sau lượt của Ma sói và Quản trò sẽ cho anh ta biết nạn nhân là ai. Yêu tinh có quyền quyết định xem mình có muốn chuyển người bị giết thành người bên trái hay bên phải của Nạn nhân ban đầu hay không."
  },
  "chupacabra": {
    "name": "Chupacabra",
    "description": "Thuộc phe thứ 3. Hàng đêm Chupacbra sẽ thức dậy, chọn một người chơi. Nếu người chơi đó là Ma sói, người chơi đó sẽ chết. Nếu tất cả Ma sói chết, Chupacabra sẽ chọn những người chơi ở các phe khác."
  },
  "beholder": {
    "name": "BeHolder",
    "description": "Thuộc phe Dân làng. Đêm đầu tiên, Beholder tỉnh dậy, Quản trò sẽ cho biết ai là Tiên tri. Beholder có vai trò hỗ trợ cho Tiên tri để củng cố lòng tin của mọi người vào ban ngày, giúp phe Dân làng chiến thắng."
  },
  "count": {
    "name": "Bá Tước",
    "description": "Thuộc phe Dân làng. Đêm đầu tiên, Bá tước sẽ thức dậy và Quản trò sẽ cho Bá tước biết ở mỗi bên nửa ngôi làng có bao nhiêu Ma sói. Quản trò nên chỉ cho Bá tước biết vị trí một nửa được xác định từ đâu ( tính từ vị trí của Bá tước)."
  },
  "insomniac": {
    "name": "Kẻ Mất Ngủ",
    "description": "Thuộc phe Dân làng. Mỗi đêm thức dậy, Quản trò sẽ cho Kẻ mất ngủ biết 1 trong 2 người ngồi bên cạnh (không tính người bị loại) của Kẻ mất ngủ có thức dậy vào Ban đêm không ( tức có một năng lực nào đó), bằng cách ra dấu ví dụ gật đầu."
  },
  "the_thing": {
    "name": "The Thing",
    "description": "Thuộc phe Dân làng. Mỗi đêm, The Thing sẽ tỉnh dậy và vỗ vào người ngồi bên cạnh mình."
  },
  "bogeyman": {
    "name": "Ông Kẹ",
    "description": "Thuộc phe thứ 3. Mỗi đêm, nếu phe Ma sói không chọn nhanh mục tiêu trong thời gian quy định thì Ông kẹ sẽ chọn thay. Ông Kẹ sẽ chiến thắng nếu tất cả những người chơi thức dậy ban đêm đều bị loại."
  },
  "frankenstein": {
    "name": "Frankenstein's Monster",
    "description": "Thuộc phe Dân làng. Mỗi khi có một người chơi có năng lực đặc biệt chết, Frankenstein sẽ lấy sức mạnh của người đó. Khi đến lượt thức dậy của vai trò bị loại, Quản trò ra hiệu Frankenstein dậy và thực hiện thay. Sức mạnh của Frankenstein là cộng dồn, chỉ bị mất đi khi Frankenstein bị loại."
  },
  "blob": {
    "name": "Chất nhầy",
    "description": "Thuộc phe thứ 3. Mỗi đêm, một người chơi ở phía tay phải của Chất nhầy sẽ lần lượt bị Chất nhầy xâm lấn. Nếu tất cả người chơi còn sống đều bị xâm lấn thì Chất nhầy sẽ dành chiến thắng."
  },
  "zombie": {
    "name": "Zombie",
    "description": "Thuộc phe thứ 3. Mỗi đêm Zombie sẽ tỉnh dậy và chọn một người chơi để ăn não. Người chơi bị ăn não sẽ không còn được quyền bình chọn nữa. Nếu tất cả người chơi còn sống đều bị ăn não thì Zombie sẽ dành chiến thắng."
  },
  "dracula": {
    "name": "Bá Tước Dracula",
    "description": "Thuộc phe thứ 3. Mỗi đêm Dracula tỉnh dậy và chọn một người chơi làm vợ. Nếu Dracula có 3 người vợ còn sống sau một ngày đêm thì Dracula giành chiến thắng."
  },
  "mummy": {
    "name": "Xác ướp",
    "description": "Thuộc phe Dân làng. Mỗi đêm Xác ướp thức dậy và chọn một người chơi. Vào ngày hôm sau phiếu bầu của người chơi đó sẽ được tính theo phiếu bầu của Xác ướp. Ví dụ: Xác ướp chọn Có treo cổ và Người chơi chọn Không. Khi đó quản trò tính là 2 phiếu bầu Có."
  },
  "teen_wolf": {
    "name": "Sói Tuổi Teen",
    "description": "Thuộc phe Sói và mỗi đêm thức dậy cùng Phe Sói. Sói tuổi Teen rất háo hức vì được trở thành Ma sói nên mỗi ngày anh ta cần phải nói một từ \" Ma sói\". Nếu không sẽ bị loại."
  }
};
