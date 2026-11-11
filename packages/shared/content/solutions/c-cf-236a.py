class Solution:
    def determineGender(self, name: str) -> str:
        return "CHAT WITH HER!" if len(set(name)) % 2 == 0 else "IGNORE HIM!"
