import type { Role, Step } from './types.ts';

// v9 adds the moderator's explicit pre-game Witch visibility option.
export const RULES = Object.freeze({
  version: 'classic-core-v9',
  guardCanSelfProtect: true,
  guardCanRepeat: false,
  protectionBlocksPoison: false,
  witchCanSelfHeal: true,
  witchCanUseBoth: true,
  revealDeadRoles: false,
});
export const ROLES: Record<Role, { name: string; description: string }> = {
  wolf: { name: 'Ma Sói', description: 'Cùng bầy chọn một người không mang vai Sói để cắn mỗi đêm. Tất cả Sói sống phải chọn cùng mục tiêu.' },
  villager: { name: 'Dân làng', description: 'Thảo luận và biểu quyết ban ngày. Không có hành động ban đêm.' },
  seer: { name: 'Tiên tri', description: 'Mỗi đêm soi một người khác còn sống. Sói thường hiện Sói; Người hóa sói cũng hiện Sói, còn Người sói che giấu hiện không phải Sói.' },
  guard: { name: 'Bảo vệ', description: 'Mỗi đêm bảo vệ một người, được chọn mình nhưng không cùng người hai đêm liên tiếp. Chỉ chặn Sói cắn, không chặn độc.' },
  witch: { name: 'Phù thủy', description: 'Có một thuốc cứu và một thuốc độc cho cả ván. Được tự cứu, dùng cả hai cùng đêm hoặc để dành. Người được Bảo vệ chặn đòn cắn không được báo là nạn nhân. Quản trò chọn có cho xem nạn nhân khi còn thuốc cứu hay không. Khi ẩn, bạn chỉ quyết định dùng thuốc; máy chủ cứu một nạn nhân theo thứ tự ghế. Đã dùng là mất thuốc, kể cả không có nạn nhân. Hết thuốc vẫn được gọi dậy.' },
  hunter: { name: 'Thợ săn', description: 'Khi chết (do bị cắn, đầu độc hoặc treo cổ), Thợ săn được bắn một phát súng cuối cùng để tiêu diệt một người chơi khác còn sống.' },
  cupid: { name: 'Thần tình yêu', description: 'Đêm đầu tiên thức dậy chọn 2 người yêu nhau. Khi một trong hai người chết, người kia sẽ chết theo vì đau buồn.' },
  cursed: { name: 'Kẻ bị nguyền', description: 'Ban đầu thuộc phe Dân làng. Nếu bị Ma Sói cắn sẽ không chết mà biến thành Ma Sói từ đêm tiếp theo. Nếu bị đầu độc hoặc treo cổ thì chết bình thường.' },
  doppelganger: { name: 'Nhân bản', description: 'Đêm đầu tiên thức dậy chọn một người làm mục tiêu. Khi mục tiêu đó chết, Nhân bản sẽ nhận vai hiện tại và tài nguyên còn lại của người đó; phe được tính theo vai mới và liên kết tình nhân của chính mình.' },
  apprentice_seer: { name: 'Tiên tri tập sự', description: 'Khi Tiên tri chết và không còn Tiên tri sống, trở thành Tiên tri tại công bố hoặc kết thúc đợt chết ban ngày. Không dùng biến thể soi hai lần.' },
  aura_seer: { name: 'Tiên tri hào quang', description: 'Mỗi đêm chọn người khác để biết có năng lực đặc biệt hay không. Chỉ Dân thường và Sói thường không có năng lực.' },
  mystic_seer: { name: 'Tiên tri huyền bí', description: 'Mỗi đêm chọn người khác và biết chính xác vai hiện tại của họ.' },
  mentalist: { name: 'Nhà tinh thần học', description: 'Mỗi đêm chọn hai người khác nhau, khác mình, để biết họ có cùng phe hiện tại hay không.' },
  lycan: { name: 'Người hóa sói', description: 'Thuộc phe Dân và không cắn; Tiên tri thường soi ra Sói. Tiên tri huyền bí vẫn thấy vai thật.' },
  wolf_man: { name: 'Người sói', description: 'Thuộc phe Sói, cắn cùng bầy nhưng Tiên tri thường soi ra không phải Sói.' },
  tough_guy: { name: 'Người cứng cỏi', description: 'Bị cắn không được chặn sẽ chết vào cuối đêm tiếp theo. Bảo vệ/cứu đêm sau không xóa vết thương cũ. Độc, bắn và chết theo tình nhân vẫn gây chết ngay.' },
  diseased: { name: 'Người bệnh', description: 'Nếu thực sự chết do cắn, bầy Sói mất quyền cắn toàn bộ đêm tiếp theo. Độc/bắn/phán quyết riêng không gây bệnh cho Sói.' },
  prince: { name: 'Hoàng tử', description: 'Không chết do phán quyết treo cổ; công khai vai và kết thúc phán quyết hôm đó. Các nguyên nhân chết khác vẫn áp dụng.' },
  mad_bomber: { name: 'Kẻ đánh bom', description: 'Khi chết, kéo theo người sống gần nhất bên trái và bên phải theo thứ tự ghế trong danh sách tạo ván; có thể gây chuỗi chết tiếp.' },

  wolf_cub: { name: 'Sói con', description: 'Là Sói. Chết bình thường cho bầy cắn hai người đêm kế tiếp. Được tự đề nghị hy sinh; cả bầy cùng đồng ý thì chọn hai nạn nhân ngay đêm đó, không cộng thêm lượt đêm sau.' },
  big_bad_wolf: { name: 'Sói đại ca', description: 'Là Sói. Khi còn sống, bầy được chọn hai nạn nhân sống ngồi cạnh nhau. Bầy không được biết ai là Sói đại ca qua dữ liệu bầy.' },
  alpha_wolf: { name: 'Sói Alpha', description: 'Là Sói. Đêm ngay sau khi một Sói khác chết ban ngày, được đổi một mục tiêu cắn thành Sói. Một lần thành công cả ván; bảo vệ/cứu hoặc mục tiêu chết cùng đợt không làm mất quyền.' },

  dire_wolf: { name: 'Sói tuyết', description: 'Chọn một bạn đồng hành khi nhận vai; nếu người đó chết thì Sói tuyết chết theo. Sói tuyết chết không giết bạn đồng hành. Cắn cùng bầy.' },
  virginia_woolf: { name: 'Virginia Woolf', description: 'Mặc định phe Dân. Chọn người sợ mình khi nhận vai; người đó được báo riêng và sẽ chết nếu Virginia chết. Không cắn cùng bầy.' },
  fruit_wolf: { name: 'Sói ăn chay', description: 'Cắn cùng bầy khi còn Sói khác. Nếu là Sói cuối cùng thì vẫn thức và xác nhận không cắn, kể cả khi có thưởng cắn đôi.' },
  fang_face: { name: 'Nanh sói', description: 'Thức cùng bầy đêm đầu. Từ đêm thứ hai ngủ khi còn Sói khác sống; khi là Sói cuối cùng thì thức và cắn. Khi ngủ chỉ giữ thông tin bầy đã biết.' },
  dream_wolf: { name: 'Sói chiêm bao', description: 'Không thức hoặc biết bầy cho đến khi một Sói thật chết được công bố. Sau đó thức và cắn cùng bầy.' },

};
export const NIGHT_STEPS: Step[] = ['guard', 'seer', 'aura_seer', 'mystic_seer', 'mentalist', 'wolves', 'alpha_wolf', 'witch'];
export const MODERATOR_SCRIPTS: Record<Step, { wake: string; sleep?: string }> = {
  dire_wolf: { wake: 'Sói tuyết thức dậy, chọn một bạn đồng hành.', sleep: 'Sói tuyết đi ngủ.' },
  virginia_woolf: { wake: 'Virginia Woolf thức dậy, chọn người sợ mình.', sleep: 'Virginia Woolf đi ngủ.' },
  alpha_wolf: { wake: 'Sói Alpha thức dậy, quyết định có chuyển hóa một nạn nhân của bầy hay không.', sleep: 'Sói Alpha đi ngủ.' },
  aura_seer: { wake: 'Tiên tri hào quang thức dậy, chọn người để tìm năng lực đặc biệt.', sleep: 'Tiên tri hào quang đi ngủ.' },
  mystic_seer: { wake: 'Tiên tri huyền bí thức dậy, chọn người để biết vai hiện tại.', sleep: 'Tiên tri huyền bí đi ngủ.' },
  mentalist: { wake: 'Nhà tinh thần học thức dậy, chọn hai người để so sánh phe.', sleep: 'Nhà tinh thần học đi ngủ.' },
  cupid: {
    wake: 'Cả làng đi ngủ... Thần tình yêu Cupid thức dậy, hãy chọn 2 người để kết duyên trên điện thoại...',
    sleep: 'Cupid đi ngủ.',
  },
  doppelganger: {
    wake: 'Nhân bản thức dậy, hãy chọn một người chơi để sao chép trên điện thoại...',
    sleep: 'Nhân bản đi ngủ.',
  },
  guard: {
    wake: 'Bảo vệ thức dậy, chọn một người bạn muốn bảo vệ đêm nay trên điện thoại...',
    sleep: 'Bảo vệ đi ngủ.',
  },
  seer: {
    wake: 'Tiên tri thức dậy, chọn một người bạn muốn soi danh tính trên điện thoại...',
    sleep: 'Tiên tri đi ngủ.',
  },
  wolves: {
    wake: 'Bầy Sói thức dậy, nhìn nhau và cùng chọn một con mồi trên điện thoại...',
    sleep: 'Bầy Sói đi ngủ.',
  },
  witch: {
    wake: 'Phù thủy thức dậy, kiểm tra và quyết định dùng bình thuốc trên điện thoại...',
    sleep: 'Phù thủy đi ngủ.',
  },
  hunter: {
    wake: 'Thợ săn trước khi lìa đời, hãy chỉ định phát đạn cuối cùng trên điện thoại...',
    sleep: 'Phát đạn định mệnh đã nổ.',
  },
  review: {
    wake: 'Cả làng vẫn nhắm mắt say ngủ trong khi quản trò tổng kết diễn biến đêm...',
  },
  day: {
    wake: 'Trời đã sáng, cả làng thức dậy xem ai còn sống ai đã chết!',
  },
  ended: {
    wake: 'Ván chơi đã kết thúc!',
  },
};
