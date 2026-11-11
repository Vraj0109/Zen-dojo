class Solution:
    def findNextDistinctYear(self, y: int) -> int:
        while True:
            y += 1
            if len(set(str(y))) == len(str(y)):
                return y
