#include <vector>
#include <unordered_set>

using namespace std;

class Solution {
public:
    vector<int> removeDuplicates(vector<int>& nums) {
        unordered_set<int> seen;
        vector<int> res;
        for (int x : nums) {
            if (!seen.count(x)) {
                seen.insert(x);
                res.push_back(x);
            }
        }
        return res;
    }
};
