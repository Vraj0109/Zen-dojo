#include <vector>
#include <numeric>
#include <cstdlib>

using namespace std;

class Solution {
    vector<int> weights;

public:
    Solution(vector<int>& w) : weights(w) {}

    int pickIndex() {
        long long total = 0;
        for (int x : weights) total += x;
        long long target = (rand() % total) + 1;
        long long running = 0;
        for (int i = 0; i < (int)weights.size(); i++) {
            running += weights[i];
            if (running >= target) return i;
        }
        return weights.size() - 1;
    }
};
