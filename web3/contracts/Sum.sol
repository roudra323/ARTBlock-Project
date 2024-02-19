// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Sum {
    uint16 public x;
    uint16 public y;
    uint32 public sum;

    event Summed(string message);

    constructor() {
        x = 5;
        y = 2;
    }

    function summation() public {
        sum = x + y;
        emit Summed("Summation occured");
    }
}
