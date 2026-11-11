class WordDictionary:
    def __init__(self):
        self.root = {}

    def addWord(self, word: str) -> None:
        cur = self.root
        for ch in word:
            if ch not in cur:
                cur[ch] = {}
            cur = cur[ch]
        cur['#'] = True

    def search(self, word: str) -> bool:
        def match(node: dict, i: int) -> bool:
            if i == len(word):
                return '#' in node
            ch = word[i]
            if ch == '.':
                for key, child in node.items():
                    if key != '#' and match(child, i + 1):
                        return True
                return False
            if ch not in node:
                return False
            return match(node[ch], i + 1)

        return match(self.root, 0)
