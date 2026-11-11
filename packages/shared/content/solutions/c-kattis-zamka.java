class Solution {
    private int digitSum(int num) {
        int sum = 0;
        while (num > 0) {
            sum += num % 10;
            num /= 10;
        }
        return sum;
    }

    public int[] findZamkaMinMax(int l, int d, int x) {
        int n = -1, m = -1;
        for (int i = l; i <= d; i++) {
            if (digitSum(i) == x) {
                n = i;
                break;
            }
        }
        for (int i = d; i >= l; i--) {
            if (digitSum(i) == x) {
                m = i;
                break;
            }
        }
        return new int[]{n, m};
    }
}
