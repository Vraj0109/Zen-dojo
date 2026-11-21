class Solution {
public:
    long long sumSquareDifference(int n) {
        long long sum = 0;
        long long sum_sq = 0;
        for (int i = 1; i <= n; i++) {
            sum += i;
            sum_sq += (long long)i * i;
        }
        return sum * sum - sum_sq;
    }
};
