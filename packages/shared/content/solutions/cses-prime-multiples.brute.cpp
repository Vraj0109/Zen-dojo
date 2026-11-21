#include <vector>

using namespace std;

class Solution {
public:
    long long primeMultiples(long long n, vector<long long>& primes) {
        int k = primes.size();
        long long ans = 0;
        int totalSubsets = 1 << k;
        for (int mask = 1; mask < totalSubsets; mask++) {
            int bits = 0;
            long long prod = 1;
            bool overflow = false;
            for (int i = 0; i < k; i++) {
                if ((mask >> i) & 1) {
                    bits++;
                    if (primes[i] > n / prod) {
                        overflow = true;
                        break;
                    }
                    prod *= primes[i];
                }
            }
            if (overflow) continue;
            long long count = n / prod;
            if (bits % 2 == 1) {
                ans += count;
            } else {
                ans -= count;
            }
        }
        return ans;
    }
};
