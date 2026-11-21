#include <vector>
#include <bitset>
#include <algorithm>

class Solution {
public:
    std::vector<int> moneySums(std::vector<int>& coins) {
        std::bitset<100001> bs;
        bs[0] = 1;
        int maxSum = 0;
        for (int c : coins) {
            bs |= (bs << c);
            maxSum += c;
        }
        std::vector<int> res;
        for (int s = 1; s <= std::min(maxSum, 100000); s++) {
            if (bs[s]) res.push_back(s);
        }
        return res;
    }
};
