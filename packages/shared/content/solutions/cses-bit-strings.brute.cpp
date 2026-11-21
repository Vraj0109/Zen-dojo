class Solution {
public:
    int bitStrings(int n) {
        long long res = 1;
        long long mod = 1000000007;
        for (int i = 0; i < n; i++) {
            res = (res * 2) % mod;
        }
        return res;
    }
};
