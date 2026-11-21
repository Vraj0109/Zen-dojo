class WordDictionary:
    def __init__(self):
        self.words = []

    def addWord(self, word: str) -> None:
        self.words.append(word)

    def search(self, word: str) -> bool:
        n = len(word)
        for w in self.words:
            if len(w) != n:
                continue
            ok = True
            for c1, c2 in zip(word, w):
                if c1 != '.' and c1 != c2:
                    ok = False
                    break
            if ok:
                return True
        return False
