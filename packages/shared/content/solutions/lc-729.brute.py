class MyCalendar:
    def __init__(self):
        self.bookings = []

    def book(self, startTime: int, endTime: int) -> bool:
        for s, e in self.bookings:
            if max(startTime, s) < min(endTime, e):
                return False
        self.bookings.append((startTime, endTime))
        return True
