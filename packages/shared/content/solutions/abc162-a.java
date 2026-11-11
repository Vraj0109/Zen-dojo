class Solution {
    public String isLucky(int n) {
        while (n > 0) {
            if (n % 10 == 7) return "Yes";
            n /= 10;
        }
        return "No";
    }
}
