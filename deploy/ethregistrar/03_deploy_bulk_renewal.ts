import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre
  const { deploy } = deployments
  const { deployer, owner } = await getNamedAccounts()

  const registry = await ethers.getContract('ENSRegistry')

  await deploy('BulkRenewal', {
    from: deployer,
    args: [registry.address],
    log: true,
  })

  return true
}

func.id = 'bulk-renewal'
func.tags = ['BulkRenewal']
func.dependencies = ['ENSRegistry']

export default func
