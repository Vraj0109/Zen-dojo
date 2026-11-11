from collections import defaultdict

class MyCalendarThree:
    def __init__(self):
        self.change = defaultdict(int)

    def book(self, startTime: int, endTime: int) -> int:
        self.change[startTime] += 1
        self.change[endTime] -= 1
        running = 0
        best = 0
        for k in sorted(self.change):
            running += self.change[k]
            if running > best:
                best = running
        return best
