from typing import List

class Solution:
    def wordBreak(self, s: str, wordDict: List[str]) -> bool:
        dict_set = set(wordDict)

        def check(idx: int) -> bool:
            if idx == len(s):
                return True
            for end in range(idx + 1, len(s) + 1):
                if s[idx:end] in dict_set:
                    if check(end):
                        return True
            return False

        return check(0)
