#include <vector>
#include <algorithm>

using namespace std;

class Solution {
    int maxCoinsRec(vector<int>& arr) {
        if (arr.size() == 2) return 0; // only boundaries left
        int best = 0;
        for (size_t i = 1; i < arr.size() - 1; i++) {
            int coins = arr[i - 1] * arr[i] * arr[i + 1];
            vector<int> nextArr = arr;
            nextArr.erase(nextArr.begin() + i);
            best = max(best, coins + maxCoinsRec(nextArr));
        }
        return best;
    }
public:
    int maxCoins(vector<int>& nums) {
        vector<int> arr = {1};
        for (int x : nums) arr.push_back(x);
        arr.push_back(1);
        return maxCoinsRec(arr);
    }
};
