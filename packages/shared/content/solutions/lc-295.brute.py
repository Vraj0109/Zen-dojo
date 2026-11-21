class MedianFinder:
    def __init__(self):
        self.nums = []

    def addNum(self, num: int) -> None:
        self.nums.append(num)

    def findMedian(self) -> float:
        s = sorted(self.nums)
        n = len(s)
        if n % 2 == 1:
            return float(s[n // 2])
        else:
            return (s[n // 2 - 1] + s[n // 2]) / 2.0
