import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ZERO_HASH } from '../constants'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy } = deployments
  const { deployer, owner } = await getNamedAccounts()

  if (!network.tags.use_root) {
    return true
  }

  const registry = await ethers.getContract('PNSRegistry')

  await deploy('Root', {
    from: deployer,
    args: [registry.address],
    log: true,
  })

  const root = await ethers.getContract('Root')

  const tx1 = await registry.setOwner(ZERO_HASH, root.address)
  console.log(
    `Setting owner of root node to root contract (tx: ${tx1.hash})...`,
  )
  await tx1.wait(2)

  const rootOwner = await root.owner()
  switch (rootOwner) {
    case deployer:
      const tx2 = await root
        .connect(await ethers.getSigner(deployer))
        .transferOwnership(owner)
      console.log(
        `Transferring root ownership to final owner (tx: ${tx2.hash})...`,
      )
      await tx2.wait(2)
    case owner:
      const controller = await root.controllers(owner)
      if (!controller) {
        const tx2 = await root
          .connect(await ethers.getSigner(owner))
          .setController(owner, true)
        console.log(
          `Setting final owner as controller on root contract (tx: ${tx2.hash})...`,
        )
        await tx2.wait(2)
      }
      break
    default:
      console.log(
        `WARNING: Root is owned by ${rootOwner}; cannot transfer to owner account`,
      )
  }

  return true
}

func.id = 'root'
func.tags = ['Root']
func.dependencies = ['PNSRegistry']

export default func
