#include <vector>
#include <algorithm>

class Solution {
public:
    long long arrayDivision(std::vector<int>& arr, int k) {
        long long lo = 0, hi = 0;
        for (int x : arr) {
            lo = std::max(lo, (long long)x);
            hi += x;
        }
        long long ans = hi;
        while (lo <= hi) {
            long long mid = lo + (hi - lo) / 2;
            int count = 1;
            long long cur = 0;
            for (int x : arr) {
                if (cur + x > mid) {
                    count++;
                    cur = x;
                } else {
                    cur += x;
                }
            }
            if (count <= k) {
                ans = mid;
                hi = mid - 1;
            } else {
                lo = mid + 1;
            }
        }
        return ans;
    }
};
