class MyCalendarThree:
    def __init__(self):
        self.bookings = []

    def book(self, startTime: int, endTime: int) -> int:
        self.bookings.append((startTime, endTime))
        max_overlap = 0
        for s1, _ in self.bookings:
            t = s1
            cnt = 0
            for s2, e2 in self.bookings:
                if s2 <= t < e2:
                    cnt += 1
            if cnt > max_overlap:
                max_overlap = cnt
        return max_overlap
