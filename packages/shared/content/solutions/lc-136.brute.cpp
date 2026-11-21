#include <vector>
#include <unordered_set>

using namespace std;

class Solution {
public:
    int singleNumber(vector<int>& nums) {
        unordered_set<int> seen;
        for (int x : nums) {
            if (seen.count(x)) seen.erase(x);
            else seen.insert(x);
        }
        return *seen.begin();
    }
};
