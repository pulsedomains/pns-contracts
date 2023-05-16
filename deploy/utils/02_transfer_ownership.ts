import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts } = hre
  const { owner } = await getNamedAccounts()

  const controller = await ethers.getContract('ETHRegistrarController', owner)
  const tx = await controller.transferOwnership(
    '0xBcf8996B20E92304206cE8643E273Fef5E22f6Ef',
  )
  console.log(`Transferring owner (tx: ${tx.hash})`)
  await tx.wait()
}

func.id = 'transfer-ownership'
func.tags = ['TransferOwnership']
func.dependencies = ['ETHRegistrarController']

export default func
