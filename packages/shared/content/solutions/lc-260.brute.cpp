#include <vector>
#include <unordered_map>

using namespace std;

class Solution {
public:
    vector<int> singleNumber(vector<int>& nums) {
        unordered_map<int, int> cnt;
        for (int x : nums) cnt[x]++;
        vector<int> res;
        for (auto& p : cnt) {
            if (p.second == 1) res.push_back(p.first);
        }
        return res;
    }
};
