class Solution:
    def get2009DayOfWeek(self, d: int, m: int) -> str:
        daysPerMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        totalDays = d - 1 + sum(daysPerMonth[1:m])
        days = ["Thursday", "Friday", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"]
        return days[totalDays % 7]
