"""Extract the saved article, including malformed heading/image boundaries.

No network or third-party packages. Default is a read-only comparison.
Use --write explicitly; the previous JSON is backed up before replacement.
"""
import argparse
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import tempfile


def clean(text):
    return re.sub(r'\s+', ' ', text).strip()


class CardParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.div_depth = 0
        self.content_depth = None
        self.title_depth = 0
        self.group_parts = []
        self.group = None
        self.block = None
        self.strong_depth = 0
        self.link_depth = 0
        self.current = None
        self.trailing_links = False
        self.cards = {}
        self.locations = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get('class', '').split()
        if tag == 'div':
            self.div_depth += 1
            if 'word-content' in classes:
                if not self.group:
                    raise ValueError('Content has no group title')
                self.content_depth = self.div_depth
                self.current = None
                self.trailing_links = False
        if tag == 'span' and 'tt-bl-cote' in classes:
            self.title_depth = 1
            self.group_parts = []
        elif self.title_depth and tag == 'span':
            self.title_depth += 1
        if self.content_depth is None:
            return
        if tag in ('h3', 'h4', 'p'):
            self.block = {'tag': tag, 'tokens': [], 'line': self.getpos()[0]}
        if tag in ('strong', 'b'):
            self.strong_depth += 1
        if tag == 'a':
            self.link_depth += 1
        if self.block and tag == 'img':
            # Lazy-load placeholder src must never override the real card image.
            url = attrs.get('data-srcset') or attrs.get('data-src') or attrs.get('src', '')
            self.block['tokens'].append(('image', url, False, False))

    def handle_data(self, data):
        if self.title_depth:
            self.group_parts.append(data)
        if self.content_depth is not None and self.block:
            self.block['tokens'].append(('text', data, self.strong_depth > 0, self.link_depth > 0))

    def handle_endtag(self, tag):
        if tag == 'span' and self.title_depth:
            self.title_depth -= 1
            if not self.title_depth:
                self.group = clean(''.join(self.group_parts))
                if self.group in self.cards:
                    raise ValueError('Duplicate group: ' + self.group)
                self.cards[self.group] = {'Summary': '', 'Deck of cards': {}}
        if tag in ('strong', 'b'):
            self.strong_depth = max(0, self.strong_depth - 1)
        if tag == 'a':
            self.link_depth = max(0, self.link_depth - 1)
        if self.block and tag == self.block['tag']:
            self.consume(self.block)
            self.block = None
        if tag == 'div':
            if self.div_depth == self.content_depth:
                self.content_depth = None
                self.current = None
            self.div_depth -= 1

    def image(self, url):
        if self.current and not self.current['Image Url']:
            self.current['Image Url'] = url

    def consume(self, block):
        tokens = block['tokens']
        text = clean(''.join(t[1] for t in tokens if t[0] == 'text'))
        has_link = any(t[3] for t in tokens)
        strong_only = not any(clean(t[1]) for t in tokens if t[0] == 'text' and not t[2])
        has_image = any(t[0] == 'image' for t in tokens)
        # Drunk and Hoodlum are bold titles in the same paragraph as the
        # PREVIOUS card's image. Image-only/empty headings are not new cards.
        is_title = text and not has_link and (block['tag'] in ('h3', 'h4') or (strong_only and has_image))
        if is_title:
            first_text = next(i for i, t in enumerate(tokens) if t[0] == 'text' and clean(t[1]))
            for t in tokens[:first_text]:
                if t[0] == 'image':
                    self.image(t[1])
            deck = self.cards[self.group]['Deck of cards']
            if text in deck:
                raise ValueError('Duplicate role: ' + text)
            self.current = {'Description': '', 'Image Url': ''}
            deck[text] = self.current
            self.locations.append({'group': self.group, 'name': text, 'line': block['line'], 'tag': block['tag']})
            for t in tokens[first_text:]:
                if t[0] == 'image':
                    self.image(t[1])
            return
        if text.startswith('Ngoài ra, bạn có thể tham khảo'):
            self.trailing_links = True
        if self.trailing_links or has_link:
            return
        for t in tokens:
            if t[0] == 'image':
                self.image(t[1])
        if text:
            if self.current:
                self.current['Description'] = clean(self.current['Description'] + ' ' + text)
            else:
                section = self.cards[self.group]
                section['Summary'] = clean(section['Summary'] + ' ' + text)


def extract_cards(html):
    parser = CardParser()
    parser.feed(html)
    parser.close()
    if not parser.cards:
        raise ValueError('No article sections found')
    for group, section in parser.cards.items():
        if not section['Deck of cards']:
            raise ValueError('Empty section: ' + group)
        for name, card in section['Deck of cards'].items():
            if not card['Description'] or not card['Image Url'].startswith('https://'):
                raise ValueError('Incomplete role: ' + name)
    return parser.cards, parser.locations


def comparison(old, new):
    changes = {'added': [], 'removed': [], 'changed': []}
    for group in dict.fromkeys(list(old) + list(new)):
        before = {clean(n): c for n, c in old.get(group, {}).get('Deck of cards', {}).items()}
        after = new.get(group, {}).get('Deck of cards', {})
        for name in after:
            if name not in before:
                changes['added'].append([group, name])
            else:
                fields = [key for key in ('Description', 'Image Url') if clean(before[name].get(key, '')) != after[name][key]]
                if fields:
                    changes['changed'].append({'group': group, 'name': name, 'fields': fields})
        changes['removed'].extend([group, name] for name in before if name not in after)
    return changes


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument('--input', type=Path, default=Path(__file__).with_name('response.html'))
    args.add_argument('--output', type=Path, default=Path(__file__).with_name('cards.json'))
    mode = args.add_mutually_exclusive_group()
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args.add_argument('--report', type=Path)
    options = args.parse_args()
    html = options.input.read_bytes()
    original = options.output.read_bytes() if options.output.exists() else None
    old = json.loads(original) if original is not None else {}
    cards, locations = extract_cards(html.decode('utf-8'))
    report = {
        'source': options.input.name,
        'sourceSha256': hashlib.sha256(html).hexdigest(),
        'previousCardsSha256': hashlib.sha256(original).hexdigest() if original else None,
        'groups': {g: len(s['Deck of cards']) for g, s in cards.items()},
        'totalRoles': sum(len(s['Deck of cards']) for s in cards.values()),
        'changes': comparison(old, cards),
        'locations': locations,
    }
    backup = None
    if options.write:
        encoded = (json.dumps(cards, ensure_ascii=False, indent=4) + '\n').encode('utf-8')
        if original != encoded:
            if options.output.exists() and options.output.read_bytes() != original:
                raise RuntimeError('cards.json changed during extraction; refusing to overwrite')
            if original is not None:
                folder = options.output.parent / 'data' / 'backups'
                folder.mkdir(parents=True, exist_ok=True)
                backup = folder / ('cards.before-html-repair.' + hashlib.sha256(original).hexdigest()[:12] + '.json')
                if not backup.exists():
                    backup.write_bytes(original)
            with tempfile.NamedTemporaryFile(dir=str(options.output.parent), delete=False) as temp:
                temp.write(encoded)
                temp_name = temp.name
            os.replace(temp_name, str(options.output))
    report['backup'] = str(backup) if backup else None
    if options.report:
        options.report.parent.mkdir(parents=True, exist_ok=True)
        options.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k != 'locations'}, ensure_ascii=False, indent=2))
    if not options.write and old != cards:
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
