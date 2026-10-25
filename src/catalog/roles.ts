import { ROLES } from '../engine/rules.ts';
import type { Role } from '../engine/types.ts';

// Metadata only. Source matching does not enable a runtime role or validate rules.
export interface CatalogRole {
  id: string;
  displayName: string;
  source: { group: string; name: string; section: 'main' };
  sourceStatus: 'matched-local-html';
  notes: string[];
}
export const CATALOG_VERSION = 'source-map-v2';
export const ROLE_CATALOG: readonly CatalogRole[] = [
  {
    "id": "apprentice_seer",
    "displayName": "Apprentice Seer (Tiên tri tập sự)",
    "source": {
      "group": "Phe dân làng",
      "name": "Apprentice Seer (Tiên tri tập sự)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "aura_seer",
    "displayName": "Aura Seer (Tiên tri hào quang)",
    "source": {
      "group": "Phe dân làng",
      "name": "Aura Seer (Tiên tri hào quang)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "guard",
    "displayName": "Bodyguard (Bảo vệ)",
    "source": {
      "group": "Phe dân làng",
      "name": "Bodyguard (Bảo vệ)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": [
      "Luật runtime có mặc định riêng tại DEFAULT_RULES.md; không coi mô tả nguồn là hợp đồng thực thi."
    ]
  },
  {
    "id": "cupid",
    "displayName": "Cupid (Thần tình yêu)",
    "source": {
      "group": "Phe dân làng",
      "name": "Cupid (Thần tình yêu)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "diseased",
    "displayName": "Diseased (Người bệnh)",
    "source": {
      "group": "Phe dân làng",
      "name": "Diseased (Người bệnh)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "ghost",
    "displayName": "Ghost ( Con ma)",
    "source": {
      "group": "Phe dân làng",
      "name": "Ghost ( Con ma)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "hunter",
    "displayName": "Hunter (Thợ săn)",
    "source": {
      "group": "Phe dân làng",
      "name": "Hunter (Thợ săn)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": [
      "Luật runtime có mặc định riêng tại DEFAULT_RULES.md; không coi mô tả nguồn là hợp đồng thực thi."
    ]
  },
  {
    "id": "idiot",
    "displayName": "Idiot (Thằng ngốc)",
    "source": {
      "group": "Phe dân làng",
      "name": "Idiot (Thằng ngốc)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "lycan",
    "displayName": "Lycan (Người hóa sói)",
    "source": {
      "group": "Phe dân làng",
      "name": "Lycan (Người hóa sói)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "mason",
    "displayName": "Mason ( Sinh đôi)",
    "source": {
      "group": "Phe dân làng",
      "name": "Mason ( Sinh đôi)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "mayor",
    "displayName": "Mayor (Thị trưởng)",
    "source": {
      "group": "Phe dân làng",
      "name": "Mayor (Thị trưởng)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "old_hag",
    "displayName": "Old Hag (Phù Thủy già)",
    "source": {
      "group": "Phe dân làng",
      "name": "Old Hag (Phù Thủy già)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "pacifist",
    "displayName": "Pacifist (Người yêu hòa bình)",
    "source": {
      "group": "Phe dân làng",
      "name": "Pacifist (Người yêu hòa bình)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "paranormal_investigator",
    "displayName": "P.I. (Paranormal Investigator) ( Thám tử)",
    "source": {
      "group": "Phe dân làng",
      "name": "P.I. (Paranormal Investigator) ( Thám tử)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "priest",
    "displayName": "Priest (Thầy tu)",
    "source": {
      "group": "Phe dân làng",
      "name": "Priest (Thầy tu)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "prince",
    "displayName": "Prince ( Hoàng tử)",
    "source": {
      "group": "Phe dân làng",
      "name": "Prince ( Hoàng tử)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "seer",
    "displayName": "Seeker (Tiên tri)",
    "source": {
      "group": "Phe dân làng",
      "name": "Seeker (Tiên tri)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": [
      "Giữ cách viết tên trong HTML nguồn, ID chuẩn hóa độc lập với tên hiển thị."
    ]
  },
  {
    "id": "spellcaster",
    "displayName": "Spellcaster (Người phù phép)",
    "source": {
      "group": "Phe dân làng",
      "name": "Spellcaster (Người phù phép)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "tough_guy",
    "displayName": "Tough Guy (Người cứng cỏi)",
    "source": {
      "group": "Phe dân làng",
      "name": "Tough Guy (Người cứng cỏi)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "troublemaker",
    "displayName": "Troublemaker (Kẻ phá rối)",
    "source": {
      "group": "Phe dân làng",
      "name": "Troublemaker (Kẻ phá rối)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "villager",
    "displayName": "Village (Dân làng)",
    "source": {
      "group": "Phe dân làng",
      "name": "Village (Dân làng)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "witch",
    "displayName": "Witch (Phù thủy)",
    "source": {
      "group": "Phe dân làng",
      "name": "Witch (Phù thủy)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "minion",
    "displayName": "Minion (Kẻ phản bội)",
    "source": {
      "group": "Phe sói",
      "name": "Minion (Kẻ phản bội)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "sorceress",
    "displayName": "Sorceress (Pháp sư sói)",
    "source": {
      "group": "Phe sói",
      "name": "Sorceress (Pháp sư sói)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "wolf",
    "displayName": "Werewolf (Ma sói)",
    "source": {
      "group": "Phe sói",
      "name": "Werewolf (Ma sói)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": [
      "Luật runtime có mặc định riêng tại DEFAULT_RULES.md; không coi mô tả nguồn là hợp đồng thực thi."
    ]
  },
  {
    "id": "lone_wolf",
    "displayName": "Lone Wolf (Sói cô đơn)",
    "source": {
      "group": "Phe sói",
      "name": "Lone Wolf (Sói cô đơn)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "wolf_cub",
    "displayName": "Wolf Cub (Sói con)",
    "source": {
      "group": "Phe sói",
      "name": "Wolf Cub (Sói con)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "cursed",
    "displayName": "Cursed (Kẻ bị nguyền rủa)",
    "source": {
      "group": "Đổi phe",
      "name": "Cursed (Kẻ bị nguyền rủa)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": [
      "Luật runtime có mặc định riêng tại DEFAULT_RULES.md; không coi mô tả nguồn là hợp đồng thực thi."
    ]
  },
  {
    "id": "doppelganger",
    "displayName": "Doppelganger (Nhân bản)",
    "source": {
      "group": "Đổi phe",
      "name": "Doppelganger (Nhân bản)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": [
      "Luật runtime có mặc định riêng tại DEFAULT_RULES.md; không coi mô tả nguồn là hợp đồng thực thi."
    ]
  },
  {
    "id": "drunk",
    "displayName": "Drunk ( Say rượu)",
    "source": {
      "group": "Đổi phe",
      "name": "Drunk ( Say rượu)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "cult_leader",
    "displayName": "Cult Leader ( Trưởng giáo phái)",
    "source": {
      "group": "Phe thứ 3",
      "name": "Cult Leader ( Trưởng giáo phái)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "hoodlum",
    "displayName": "Hoodlum ( Du côn)",
    "source": {
      "group": "Phe thứ 3",
      "name": "Hoodlum ( Du côn)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "tanner",
    "displayName": "Tanner (Chán đời)",
    "source": {
      "group": "Phe thứ 3",
      "name": "Tanner (Chán đời)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "vampire",
    "displayName": "Vampire (Ma cà rồng)",
    "source": {
      "group": "Phe thứ 3",
      "name": "Vampire (Ma cà rồng)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "big_bad_wolf",
    "displayName": "Big Bad Wolf (Sói đại ca)",
    "source": {
      "group": "Bản mở rộng Wolf Pack",
      "name": "Big Bad Wolf (Sói đại ca)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "dire_wolf",
    "displayName": "Dire Wolf (Sói tuyết)",
    "source": {
      "group": "Bản mở rộng Wolf Pack",
      "name": "Dire Wolf (Sói tuyết)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "fruit_wolf",
    "displayName": "Fruit Wolf (Sói ăn chay)",
    "source": {
      "group": "Bản mở rộng Wolf Pack",
      "name": "Fruit Wolf (Sói ăn chay)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "fang_face",
    "displayName": "Fang Face (Nanh sói)",
    "source": {
      "group": "Bản mở rộng Wolf Pack",
      "name": "Fang Face (Nanh sói)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "wolverine",
    "displayName": "Wolverine (Chó sói)",
    "source": {
      "group": "Bản mở rộng Wolf Pack",
      "name": "Wolverine (Chó sói)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "virginia_woolf",
    "displayName": "Virginia Woolf",
    "source": {
      "group": "Bản mở rộng Wolf Pack",
      "name": "Virginia Woolf",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "alpha_wolf",
    "displayName": "Alpha Wofl ( Sói Alpha)",
    "source": {
      "group": "Bản mở rộng Hunting Party",
      "name": "Alpha Wofl ( Sói Alpha)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": [
      "Giữ cách viết tên trong HTML nguồn, ID chuẩn hóa độc lập với tên hiển thị."
    ]
  },
  {
    "id": "mystic_seer",
    "displayName": "Mystic Seeker ( Tiên tri Huyền bí)",
    "source": {
      "group": "Bản mở rộng Hunting Party",
      "name": "Mystic Seeker ( Tiên tri Huyền bí)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": [
      "Giữ cách viết tên trong HTML nguồn, ID chuẩn hóa độc lập với tên hiển thị."
    ]
  },
  {
    "id": "mad_bomber",
    "displayName": "Mad Bomberz (Kẻ đánh bom)",
    "source": {
      "group": "Bản mở rộng Hunting Party",
      "name": "Mad Bomberz (Kẻ đánh bom)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": [
      "Giữ cách viết tên trong HTML nguồn, ID chuẩn hóa độc lập với tên hiển thị."
    ]
  },
  {
    "id": "revealer",
    "displayName": "Revealer (Kẻ khám phá)",
    "source": {
      "group": "Bản mở rộng Hunting Party",
      "name": "Revealer (Kẻ khám phá)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "huntress",
    "displayName": "Huntress ( Nữ Thợ săn)",
    "source": {
      "group": "Bản mở rộng Hunting Party",
      "name": "Huntress ( Nữ Thợ săn)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "mentalist",
    "displayName": "Mentalist ( Nhà tinh thần học)",
    "source": {
      "group": "Bản mở rộng Hunting Party",
      "name": "Mentalist ( Nhà tinh thần học)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "bigfoot",
    "displayName": "Chân to",
    "source": {
      "group": "Bản mở rộng Urban Legends",
      "name": "Chân to",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "nostradamus",
    "displayName": "Nhà Tiên Tri Nostradamus",
    "source": {
      "group": "Bản mở rộng Urban Legends",
      "name": "Nhà Tiên Tri Nostradamus",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "bloody_mary",
    "displayName": "Bloody Marry",
    "source": {
      "group": "Bản mở rộng Urban Legends",
      "name": "Bloody Marry",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": [
      "Giữ cách viết tên trong HTML nguồn, ID chuẩn hóa độc lập với tên hiển thị."
    ]
  },
  {
    "id": "leprechaun",
    "displayName": "Yêu Tinh",
    "source": {
      "group": "Bản mở rộng Urban Legends",
      "name": "Yêu Tinh",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "chupacabra",
    "displayName": "Chupacabra",
    "source": {
      "group": "Bản mở rộng Urban Legends",
      "name": "Chupacabra",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "wolf_man",
    "displayName": "Wolf-man (Người sói)",
    "source": {
      "group": "Bản mở rộng Urban Legends",
      "name": "Wolf-man (Người sói)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "beholder",
    "displayName": "BeHolder",
    "source": {
      "group": "Bản mở rộng Night Terrors",
      "name": "BeHolder",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "count",
    "displayName": "Bá Tước",
    "source": {
      "group": "Bản mở rộng Night Terrors",
      "name": "Bá Tước",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "insomniac",
    "displayName": "Kẻ Mất Ngủ",
    "source": {
      "group": "Bản mở rộng Night Terrors",
      "name": "Kẻ Mất Ngủ",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "the_thing",
    "displayName": "The Thing",
    "source": {
      "group": "Bản mở rộng Night Terrors",
      "name": "The Thing",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "dream_wolf",
    "displayName": "Sói Chiêm Bao",
    "source": {
      "group": "Bản mở rộng Night Terrors",
      "name": "Sói Chiêm Bao",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "bogeyman",
    "displayName": "Ông Kẹ",
    "source": {
      "group": "Bản mở rộng Night Terrors",
      "name": "Ông Kẹ",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "frankenstein",
    "displayName": "Frankenstein's Monster",
    "source": {
      "group": "Bản mở rộng Classic Movie Monster",
      "name": "Frankenstein's Monster",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "blob",
    "displayName": "The Blob ( Chất nhầy)",
    "source": {
      "group": "Bản mở rộng Classic Movie Monster",
      "name": "The Blob ( Chất nhầy)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "zombie",
    "displayName": "Zombie",
    "source": {
      "group": "Bản mở rộng Classic Movie Monster",
      "name": "Zombie",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "dracula",
    "displayName": "Bá Tước Dracula",
    "source": {
      "group": "Bản mở rộng Classic Movie Monster",
      "name": "Bá Tước Dracula",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "mummy",
    "displayName": "The Mummy ( Xác ướp)",
    "source": {
      "group": "Bản mở rộng Classic Movie Monster",
      "name": "The Mummy ( Xác ướp)",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  },
  {
    "id": "teen_wolf",
    "displayName": "Sói Tuổi Teen",
    "source": {
      "group": "Bản mở rộng Classic Movie Monster",
      "name": "Sói Tuổi Teen",
      "section": "main"
    },
    "sourceStatus": "matched-local-html",
    "notes": []
  }
];
export function isImplementedRole(id: string): id is Role { return Object.hasOwn(ROLES, id); }
export function roleCoverage() {
  return ROLE_CATALOG.map(role => ({ ...structuredClone(role), implemented: isImplementedRole(role.id) }));
}
