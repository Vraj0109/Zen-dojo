class Solution:
    def stringTask(self, s: str) -> str:
        vowels = set("aoyeui")
        res = []
        for c in s.lower():
            if c not in vowels:
                res.append('.' + c)
        return "".join(res)
