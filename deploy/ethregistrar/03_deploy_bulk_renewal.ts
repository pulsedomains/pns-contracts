import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const controller = await ethers.getContract('ETHRegistrarController')

  await deploy('StaticBulkRenewal', {
    from: deployer,
    args: [controller.address],
    log: true,
  })

  return true
}

func.id = 'static-bulk-renewal'
func.tags = ['StaticBulkRenewal']
func.dependencies = ['ETHRegistrarController']

export default func
