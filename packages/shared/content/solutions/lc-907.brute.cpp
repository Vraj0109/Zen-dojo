#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    int sumSubarrayMins(vector<int>& arr) {
        const long long MOD = 1'000'000'007;
        int n = arr.size();
        long long total = 0;
        for (int i = 0; i < n; i++) {
            int curMin = arr[i];
            for (int j = i; j < n; j++) {
                curMin = min(curMin, arr[j]);
                total = (total + curMin) % MOD;
            }
        }
        return (int)total;
    }
};
