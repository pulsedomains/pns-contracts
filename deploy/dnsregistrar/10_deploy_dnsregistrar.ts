import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre
  const { deploy } = deployments
  const { deployer, owner } = await getNamedAccounts()

  const registry = await ethers.getContract('ENSRegistry')
  const dnssec = await ethers.getContract('DNSSECImpl')
  const resolver = await ethers.getContract('OffchainDNSResolver')
  const root = await ethers.getContract('Root')

  const publicSuffixList = await deploy('TLDPublicSuffixList', {
    from: deployer,
    args: [],
    log: true,
  })

  const tx = await deploy('DNSRegistrar', {
    from: deployer,
    args: [
      '0x0000000000000000000000000000000000000000',
      resolver.address,
      dnssec.address,
      publicSuffixList.address,
      registry.address,
    ],
    log: true,
  })
  console.log(`Deployed DNSRegistrar to ${tx.address}`)

  const tx2 = await root
    .connect(await ethers.getSigner(owner))
    .setController(tx.address, true)
  console.log(`Set DNSRegistrar as controller of Root (${tx2.hash})`)
  await tx2.wait()

  return true
}

func.id = 'dns-registrar'
func.tags = ['DNSRegistrar']
func.dependencies = [
  'ENSRegistry',
  'DNSSecOracle',
  'OffchainDNSResolver',
  'Root',
]

export default func
