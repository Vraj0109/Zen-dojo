from typing import List

class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        def is_anagram(a: str, b: str) -> bool:
            if len(a) != len(b):
                return False
            cnt = [0] * 26
            for c in a:
                cnt[ord(c) - 97] += 1
            for c in b:
                cnt[ord(c) - 97] -= 1
                if cnt[ord(c) - 97] < 0:
                    return False
            return True

        n = len(strs)
        visited = [False] * n
        res = []
        for i in range(n):
            if visited[i]:
                continue
            group = [strs[i]]
            visited[i] = True
            for j in range(i + 1, n):
                if not visited[j] and is_anagram(strs[i], strs[j]):
                    visited[j] = True
                    group.append(strs[j])
            res.append(group)
        return res
