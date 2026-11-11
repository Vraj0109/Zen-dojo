class Solution {
    public int findNextDistinctYear(int y) {
        while (true) {
            y++;
            int a = y / 1000;
            int b = (y / 100) % 10;
            int c = (y / 10) % 10;
            int d = y % 10;
            if (a != b && a != c && a != d && b != c && b != d && c != d) {
                return y;
            }
        }
    }
}
