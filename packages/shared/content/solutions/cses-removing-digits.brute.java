class Solution {
    public int removingDigits(int n) {
        int steps = 0;
        while (n > 0) {
            int temp = n, maxD = 0;
            while (temp > 0) {
                maxD = Math.max(maxD, temp % 10);
                temp /= 10;
            }
            n -= maxD;
            steps++;
        }
        return steps;
    }
}
