class Solution:
    def sundaysOnFirst(self, startYear: int, endYear: int) -> int:
        def leap(y: int) -> bool:
            return y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)

        dow = 1  # 0 = Sunday, 1 = Monday, 1 Jan 1900
        for y in range(1900, startYear):
            dow = (dow + (366 if leap(y) else 365)) % 7

        count = 0
        lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        for y in range(startYear, endYear + 1):
            for m in range(12):
                if dow == 0:
                    count += 1
                d = lengths[m] + (1 if m == 1 and leap(y) else 0)
                dow = (dow + d) % 7
        return count
