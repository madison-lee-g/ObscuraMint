// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, eaddress, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract ObscuraMint is ZamaEthereumConfig {
    struct Series {
        string name;
        uint32 maxSupply;
        uint32 minted;
        address creator;
        eaddress obscuraOwner;
    }

    error NotOwner();
    error ZeroAddress();
    error ZeroMaxSupply();
    error InvalidSeriesId();
    error MaxSupplyExceeded();
    error ZeroAmount();

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event SeriesCreated(uint256 indexed seriesId, address indexed creator, string name, uint32 maxSupply);
    event Minted(uint256 indexed seriesId, address indexed minter, uint32 amount);
    event ObscuraOwnerUpdated(uint256 indexed seriesId);

    address private _owner;
    Series[] private _series;
    mapping(uint256 => mapping(address => uint256)) private _balances;

    modifier onlyOwner() {
        if (msg.sender != _owner) revert NotOwner();
        _;
    }

    constructor() {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function owner() external view returns (address) {
        return _owner;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previousOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function seriesCount() external view returns (uint256) {
        return _series.length;
    }

    function getSeries(uint256 seriesId) external view returns (string memory name, uint32 maxSupply, uint32 minted, address creator) {
        if (seriesId >= _series.length) revert InvalidSeriesId();
        Series storage s = _series[seriesId];
        return (s.name, s.maxSupply, s.minted, s.creator);
    }

    function balanceOf(address account, uint256 seriesId) external view returns (uint256) {
        if (seriesId >= _series.length) revert InvalidSeriesId();
        return _balances[seriesId][account];
    }

    function getObscuraOwner(uint256 seriesId) external view returns (eaddress) {
        if (seriesId >= _series.length) revert InvalidSeriesId();
        return _series[seriesId].obscuraOwner;
    }

    function createSeries(string calldata name, uint32 maxSupply) external returns (uint256 seriesId) {
        if (maxSupply == 0) revert ZeroMaxSupply();
        seriesId = _series.length;
        _series.push(
            Series({
                name: name,
                maxSupply: maxSupply,
                minted: 0,
                creator: msg.sender,
                obscuraOwner: eaddress.wrap(bytes32(0))
            })
        );
        emit SeriesCreated(seriesId, msg.sender, name, maxSupply);
    }

    function mint(uint256 seriesId, uint32 amount) public {
        if (amount == 0) revert ZeroAmount();
        if (seriesId >= _series.length) revert InvalidSeriesId();
        Series storage s = _series[seriesId];
        uint256 nextMinted = uint256(s.minted) + uint256(amount);
        if (nextMinted > uint256(s.maxSupply)) revert MaxSupplyExceeded();
        s.minted = uint32(nextMinted);
        _balances[seriesId][msg.sender] += amount;
        emit Minted(seriesId, msg.sender, amount);
    }

    function mintOne(uint256 seriesId) external {
        mint(seriesId, 1);
    }

    function setObscuraOwner(uint256 seriesId, externalEaddress encryptedObscuraOwner, bytes calldata inputProof)
        external
        onlyOwner
    {
        if (seriesId >= _series.length) revert InvalidSeriesId();

        eaddress newObscuraOwner = FHE.fromExternal(encryptedObscuraOwner, inputProof);
        _series[seriesId].obscuraOwner = newObscuraOwner;

        FHE.allowThis(_series[seriesId].obscuraOwner);
        FHE.allow(_series[seriesId].obscuraOwner, _owner);

        emit ObscuraOwnerUpdated(seriesId);
    }
}
