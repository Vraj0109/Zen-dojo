class Solution {
    private boolean leap(int y) {
        return y % 4 == 0 && (y % 100 != 0 || y % 400 == 0);
    }

    public int sundaysOnFirst(int startYear, int endYear) {
        int dow = 1;  // 0 = Sunday, 1 = Monday, 1 January 1900
        for (int y = 1900; y < startYear; y++) {
            dow = (dow + (leap(y) ? 366 : 365)) % 7;
        }
        int count = 0;
        int[] len = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
        for (int y = startYear; y <= endYear; y++) {
            for (int m = 0; m < 12; m++) {
                if (dow == 0) count++;
                int d = len[m] + (m == 1 && leap(y) ? 1 : 0);
                dow = (dow + d) % 7;
            }
        }
        return count;
    }
}
