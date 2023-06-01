import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  let oracleAddr = '' // TODO: set chainlink oracle if it's supported, if not, use USDC/WPLS pair on pulsex
  if (oracleAddr.length === 0) {
    if (network.name === 'mainnet') {
      await deploy('PulseXOracle', {
        from: deployer,
        args: [
          '0xA1077a294dDE1B09bB078844df40758a5D0f9a27', // WPLS https://scan.pulsechain.com/address/0xA1077a294dDE1B09bB078844df40758a5D0f9a27
          '0x6753560538ECa67617A9Ce605178F788bE7E524E', // USDC/WPLS https://scan.pulsechain.com/address/0x6753560538ECa67617A9Ce605178F788bE7E524E
        ],
        log: true,
      })
      const pulsexOracle = await ethers.getContract('PulseXOracle')
      oracleAddr = pulsexOracle.address
    } else {
      await deploy('DummyOracle', {
        from: deployer,
        args: ['16000000000'],
        log: true,
      })
      const dummyOracle = await ethers.getContract('DummyOracle')
      oracleAddr = dummyOracle.address
    }
  }

  /**
   * 3 characters: $555/year
   * 4 characters: $169/year
   * 5+ characters: $5/year
   */
  await deploy('ExponentialPremiumPriceOracle', {
    from: deployer,
    args: [
      oracleAddr,
      [0, 0, '17598934550989', '5358954845256', '158548959919'],
      '100000000000000000000000000',
      21,
    ],
    log: true,
  })

  return true
}

func.id = 'price-oracle'
func.tags = ['ExponentialPremiumPriceOracle']
func.dependencies = []

export default func
