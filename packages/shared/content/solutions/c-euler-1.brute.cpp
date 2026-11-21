class Solution {
public:
    long long sumOfMultiples(int limit, int a, int b) {
        long long total = 0;
        for (int i = 1; i < limit; i++) {
            if (i % a == 0 || i % b == 0) {
                total += i;
            }
        }
        return total;
    }
};
