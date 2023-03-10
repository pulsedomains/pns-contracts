import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre
  const { owner } = await getNamedAccounts()

  const priceOracle = await ethers.getContract('DummyOracle', owner)
  const tx = await priceOracle.set(100000000000) // 1 PLS = 0.1 USD
  await tx.wait()
}

func.id = 'x-price-oracle'
func.tags = ['XPriceOracle']
func.dependencies = []

export default func
