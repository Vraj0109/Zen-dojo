from collections import deque

class Solution:
    def ladderLength(self, beginWord: str, endWord: str, wordList: list[str]) -> int:
        if endWord not in wordList:
            return 0

        def diff_one(a: str, b: str) -> bool:
            diff = 0
            for ca, cb in zip(a, b):
                if ca != cb:
                    diff += 1
                    if diff > 1:
                        return False
            return diff == 1

        all_words = [beginWord] + [w for w in wordList if w != beginWord]
        n = len(all_words)
        adj = [[] for _ in range(n)]
        for i in range(n):
            for j in range(i + 1, n):
                if diff_one(all_words[i], all_words[j]):
                    adj[i].append(j)
                    adj[j].append(i)

        q = deque([0])
        dist = [-1] * n
        dist[0] = 1
        while q:
            u = q.popleft()
            if all_words[u] == endWord:
                return dist[u]
            for v in adj[u]:
                if dist[v] == -1:
                    dist[v] = dist[u] + 1
                    q.append(v)
        return 0
