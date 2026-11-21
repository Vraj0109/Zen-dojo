class MyCalendarTwo:
    def __init__(self):
        self.bookings = []

    def book(self, startTime: int, endTime: int) -> bool:
        temp = list(self.bookings)
        temp.append((startTime, endTime))
        n = len(temp)
        for i in range(n):
            for j in range(i + 1, n):
                s1 = max(temp[i][0], temp[j][0])
                e1 = min(temp[i][1], temp[j][1])
                if s1 < e1:
                    for k in range(j + 1, n):
                        s2 = max(s1, temp[k][0])
                        e2 = min(e1, temp[k][1])
                        if s2 < e2:
                            return False
        self.bookings.append((startTime, endTime))
        return True
