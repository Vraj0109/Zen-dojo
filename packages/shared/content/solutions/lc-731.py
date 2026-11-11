class MyCalendarTwo:
    def __init__(self):
        self.all = []
        self.doubles = []

    def book(self, startTime: int, endTime: int) -> bool:
        for ds, de in self.doubles:
            if startTime < de and endTime > ds:
                return False
        for bs, be in self.all:
            s = max(startTime, bs)
            e = min(endTime, be)
            if s < e:
                self.doubles.append((s, e))
        self.all.append((startTime, endTime))
        return True
