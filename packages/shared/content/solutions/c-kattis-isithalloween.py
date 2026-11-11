class Solution:
    def checkHalloween(self, month: str, day: int) -> str:
        if (month == "OCT" and day == 31) or (month == "DEC" and day == 25):
            return "yup"
        return "nope"
