#include <vector>
#include <unordered_map>

using namespace std;

class Solution {
public:
    int singleNumber(vector<int>& nums) {
        unordered_map<int, int> counts;
        for (int x : nums) {
            counts[x]++;
        }
        for (const auto& pair : counts) {
            if (pair.second == 1) {
                return pair.first;
            }
        }
        return -1;
    }
};
