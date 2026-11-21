class Solution {
    private int gcd(int a, int b) {
        while (b != 0) {
            int t = a % b;
            a = b;
            b = t;
        }
        return a;
    }

    public int commonDivisors(int[] arr) {
        int n = arr.length;
        int maxGcd = 1;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                int g = gcd(arr[i], arr[j]);
                if (g > maxGcd) maxGcd = g;
            }
        }
        return maxGcd;
    }
}
