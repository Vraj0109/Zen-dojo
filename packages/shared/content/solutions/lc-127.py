# verify: skip-stress
from typing import List
from collections import deque

class Solution:
    def ladderLength(self, beginWord: str, endWord: str, wordList: List[str]) -> int:
        words = set(wordList)
        if endWord not in words:
            return 0
        q = deque([(beginWord, 1)])
        words.discard(beginWord)
        while q:
            w, d = q.popleft()
            if w == endWord:
                return d
            for i in range(len(w)):
                for c in "abcdefghijklmnopqrstuvwxyz":
                    if c == w[i]:
                        continue
                    nxt = w[:i] + c + w[i+1:]
                    if nxt in words:
                        words.remove(nxt)
                        q.append((nxt, d + 1))
        return 0