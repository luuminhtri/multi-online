import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('card_extraction', ROOT / 'beauti.py')
extractor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extractor)


def section(body):
    return '<div class="boxing-content"><h2><span class="tt-bl-cote">Test</span></h2><div class="word-content">' + body + '</div></div>'


def img(name):
    return '<img src="placeholder.jpg" data-srcset="https://example.com/' + name + '.png">'


class ExtractionTests(unittest.TestCase):
    def test_h4_is_a_role_and_empty_heading_is_not(self):
        data, _ = extractor.extract_cards(section('<h3> </h3><h4>Hunter</h4><p>Description</p><p>' + img('hunter') + '</p>'))
        self.assertEqual(list(data['Test']['Deck of cards']), ['Hunter'])

    def test_previous_image_before_new_heading_stays_with_previous_card(self):
        html = '<h3>Cursed</h3><p>Cursed description.</p><h3>' + img('cursed') + '<br><strong>Doppelganger</strong></h3><p>Mimic description.</p><p>' + img('doppelganger') + '</p>'
        deck = extractor.extract_cards(section(html))[0]['Test']['Deck of cards']
        self.assertTrue(deck['Cursed']['Image Url'].endswith('/cursed.png'))
        self.assertEqual(deck['Cursed']['Description'], 'Cursed description.')
        self.assertTrue(deck['Doppelganger']['Image Url'].endswith('/doppelganger.png'))

    def test_bold_paragraph_after_previous_image_creates_a_separate_role(self):
        html = '<h3>Leader</h3><p>Leader text.</p><p>' + img('leader') + '<br><strong>Hoodlum</strong></p><p>Hoodlum text.</p><p>' + img('hoodlum') + '</p>'
        deck = extractor.extract_cards(section(html))[0]['Test']['Deck of cards']
        self.assertEqual(list(deck), ['Leader', 'Hoodlum'])
        self.assertEqual(deck['Hoodlum']['Description'], 'Hoodlum text.')
        self.assertTrue(deck['Leader']['Image Url'].endswith('/leader.png'))

    def test_image_only_heading_does_not_end_description(self):
        deck = extractor.extract_cards(section('<h3>Bigfoot</h3><h3>' + img('bigfoot') + '</h3><p>Text after image.</p>'))[0]['Test']['Deck of cards']
        self.assertEqual(deck['Bigfoot']['Description'], 'Text after image.')

    def test_related_links_and_comments_are_not_roles_or_description(self):
        html = section('<h3>Role</h3><p>Actual text.</p><p>' + img('role') + '</p><p>Ngoài ra, bạn có thể tham khảo các vai khác.</p><p><strong><a href="/fake">Fake role</a></strong></p>') + '<div class="comment"><h3>Fake</h3><p>Comment text</p></div>'
        deck = extractor.extract_cards(html)[0]['Test']['Deck of cards']
        self.assertEqual(list(deck), ['Role'])
        self.assertEqual(deck['Role']['Description'], 'Actual text.')

    def test_duplicate_or_incomplete_card_fails_instead_of_silently_overwriting(self):
        with self.assertRaisesRegex(ValueError, 'Duplicate role'):
            extractor.extract_cards(section('<h3>R</h3><p>text</p><p>' + img('r') + '</p><h3>R</h3>'))
        with self.assertRaisesRegex(ValueError, 'Incomplete role'):
            extractor.extract_cards(section('<h3>R</h3><p>No image</p>'))

    def test_saved_article_has_64_complete_roles_and_correct_repaired_images(self):
        cards, locations = extractor.extract_cards((ROOT / 'response.html').read_text(encoding='utf-8'))
        self.assertEqual(len(cards), 9)
        self.assertEqual(sum(len(s['Deck of cards']) for s in cards.values()), 64)
        self.assertEqual(len(locations), 64)
        expected = [
            ('Phe dân làng', 'Hunter (Thợ săn)', 'hunter.png'),
            ('Phe dân làng', 'Old Hag (Phù Thủy già)', 'old-hag.png'),
            ('Phe dân làng', 'Pacifist (Người yêu hòa bình)', 'pacifist.png'),
            ('Đổi phe', 'Cursed (Kẻ bị nguyền rủa)', 'cursed.png'),
            ('Đổi phe', 'Doppelganger (Nhân bản)', 'doppelganger.png'),
            ('Đổi phe', 'Drunk ( Say rượu)', 'drunk.png'),
            ('Phe thứ 3', 'Hoodlum ( Du côn)', 'hoodlum.png'),
            ('Bản mở rộng Urban Legends', 'Chân to', 'Sasquatch.png'),
            ('Bản mở rộng Urban Legends', 'Nhà Tiên Tri Nostradamus', 'Nostradamus.png'),
            ('Bản mở rộng Urban Legends', 'Bloody Marry', 'Bloody_Mary.png'),
            ('Bản mở rộng Night Terrors', 'Kẻ Mất Ngủ', 'Insomniac.png'),
        ]
        for group, name, filename in expected:
            self.assertTrue(cards[group]['Deck of cards'][name]['Image Url'].endswith('/' + filename), name)
        self.assertNotIn('Doppelganger', cards['Đổi phe']['Deck of cards']['Cursed (Kẻ bị nguyền rủa)']['Description'])
        self.assertNotIn('Pacifist', cards['Phe dân làng']['Deck of cards']['Old Hag (Phù Thủy già)']['Description'])
        self.assertNotIn('Ngoài ra', cards['Bản mở rộng Classic Movie Monster']['Deck of cards']['Sói Tuổi Teen']['Description'])

    def test_cli_is_read_only_by_default_backs_up_and_writes_idempotently(self):
        with tempfile.TemporaryDirectory() as folder:
            folder = Path(folder)
            source = folder / 'article.html'
            source.write_text(section('<h4>Hunter</h4><p>Text</p><p>' + img('hunter') + '</p>'), encoding='utf-8')
            output = folder / 'cards.json'
            original = b'{"old": {"Deck of cards": {}}}'
            output.write_bytes(original)
            command = ['python3', str(ROOT / 'beauti.py'), '--input', str(source), '--output', str(output)]
            check = subprocess.run(command, capture_output=True)
            self.assertEqual(check.returncode, 1)
            self.assertEqual(output.read_bytes(), original)
            write = subprocess.run(command + ['--write'], capture_output=True)
            self.assertEqual(write.returncode, 0, write.stderr)
            self.assertEqual(list(json.loads(output.read_bytes())['Test']['Deck of cards']), ['Hunter'])
            backups = list((folder / 'data' / 'backups').glob('*.json'))
            self.assertEqual(len(backups), 1)
            self.assertEqual(backups[0].read_bytes(), original)
            second = subprocess.run(command + ['--write'], capture_output=True)
            self.assertEqual(second.returncode, 0)
            self.assertIsNone(json.loads(second.stdout)['backup'])
            self.assertEqual(subprocess.run(command, capture_output=True).returncode, 0)


if __name__ == '__main__':
    unittest.main()
