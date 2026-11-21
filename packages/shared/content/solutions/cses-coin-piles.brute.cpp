class Solution {
public:
    bool coinPiles(int a, int b) {
        if ((a + b) % 3 != 0) return false;
        long long la = a, lb = b;
        return la <= 2LL * lb && lb <= 2LL * la;
    }
};
