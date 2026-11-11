class Solution {
    public String get2009DayOfWeek(int d, int m) {
        int[] daysPerMonth = {0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
        int totalDays = d - 1;
        for (int i = 1; i < m; i++) {
            totalDays += daysPerMonth[i];
        }
        String[] days = {"Thursday", "Friday", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"};
        return days[totalDays % 7];
    }
}
