#include <vector>
#include <unordered_set>

using namespace std;

class Solution {
public:
    int detectCycle(vector<int> nums, int pos) {
        int n = nums.size();
        if (n == 0) return -1;
        auto next = [&](int i) { return i + 1 < n ? i + 1 : pos; };
        unordered_set<int> visited;
        int cur = 0;
        while (cur >= 0) {
            if (visited.count(cur)) return cur;
            visited.insert(cur);
            cur = next(cur);
        }
        return -1;
    }
};
