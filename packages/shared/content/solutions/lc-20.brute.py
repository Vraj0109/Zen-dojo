class Solution:
    def isValid(self, s: str) -> bool:
        while True:
            if "()" in s:
                s = s.replace("()", "", 1)
            elif "[]" in s:
                s = s.replace("[]", "", 1)
            elif "{}" in s:
                s = s.replace("{}", "", 1)
            else:
                break
        return len(s) == 0
